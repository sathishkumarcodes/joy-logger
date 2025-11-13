import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Instagram } from "lucide-react";
import { toast } from "sonner";

interface SocialShareProps {
  streak: number;
}

export const SocialShare = ({ streak }: SocialShareProps) => {
  const shareMessage = `I'm on a ${streak}-day streak with OneGoodThing! 🔥✨ Finding joy in everyday moments. Join me!`;
  const appUrl = window.location.origin;

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}&quote=${encodeURIComponent(shareMessage)}`;
    window.open(facebookUrl, "_blank", "width=600,height=400");
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(appUrl)}`;
    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  const handleInstagramShare = () => {
    toast.info("Copy your streak message and share it on Instagram! 📸", {
      description: shareMessage,
      duration: 5000,
    });
    navigator.clipboard.writeText(shareMessage);
  };

  return (
    <Card className="p-6 animate-fade-up border-2 border-primary/20 shadow-glow" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Share Your Journey 🌟
        </h3>
        <p className="text-sm text-muted-foreground">
          Spread positivity and inspire others!
        </p>
        <div className="flex justify-center gap-3">
          <Button
            onClick={handleFacebookShare}
            variant="outline"
            size="icon"
            className="hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] hover:scale-110 transition-all"
          >
            <Facebook className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleTwitterShare}
            variant="outline"
            size="icon"
            className="hover:bg-black hover:text-white hover:border-black hover:scale-110 transition-all"
          >
            <Twitter className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleInstagramShare}
            variant="outline"
            size="icon"
            className="hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#FCAF45] hover:text-white hover:border-transparent hover:scale-110 transition-all"
          >
            <Instagram className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
